

IP=$(curl http://169.254.169.254/2009-04-04/meta-data/public-ipv4)
INTERNAL_IP=$(curl http://169.254.169.254/latest/meta-data/local-ipv4)
NAME=alfresco-dev.malariagen.net
DNS_IP=$(dig +short ${NAME})
REPO=localhost
SOLR=localhost

if [ ${DNS_IP} != ${IP} ]
then
	echo "IPs don't match please check!"
	exit 1
fi

cp config/platform/etc/java-cas-client.properties /etc
sed -i -e "s#\(serverName=\).*#\1${NAME}#" /etc/java-cas-client.properties

export ALF_HOME=/opt/alfresco

${ALF_HOME}/alfresco-service.sh stop

if [ ${REPO} = 'localhost' -o ${REPO} = ${INTERNAL_IP} ]
then
	for i in addons/apply.sh alfresco-service.sh scripts/libreoffice.sh
	do
		sed -i -e 's#JAVA_HOME="/usr/lib/jvm/java-8-oracle"#JAVA_HOME="/usr/lib/jvm/java-8-openjdk-amd64"#' ${ALF_HOME}/${i}
		sed -i -e 's#JAVA_HOME=/usr/lib/jvm/java-8-oracle#JAVA_HOME=/usr/lib/jvm/java-8-openjdk-amd64#' ${ALF_HOME}/${i}
	done

	#Repo
	apt-get install imagemagick ghostscript libgs-dev libjpeg62 libpng16-16 libdbus-glib-1-2
	for i in alfresco-share-services alfresco-googledocs-repo alfresco-aos-module
	do
		rm modules/platform/amps/${i}*
	done
	cp --backup config/platform/var/lib/tomcat/shared/classes/alfresco-global.properties /opt/alfresco/tomcat/shared/classes/
	set -o allexport
	source config_params
	set +o allexport
	sed -i.bak -e "s#\(solr.host=\).*#\1${SOLR}#" \
		-e "s#\(db.username=\).*#\1${MYSQL_USER}#" \
		-e "s#\(db.password=\).*#\1${MYSQL_PASSWORD}#" \
		-e "s#\(db.name=\).*#\1${MYSQL_DATABASE}#" \
		-e "s#\(db.host=\).*#\1${MYSQL_HOST}#" \
		-e "s#\(mail.port=\).*#\1${MAIL_PORT}#" \
		-e "s#\(mail.host=\).*#\1${MAIL_HOST}#" \
		-e "s#\(ldap.authentication.java.naming.provider.url=\).*#\1${LDAP_SERVER}#" \
		-e "s#\(ldap.authentication.java.naming.security.principal=\).*#\1${LDAP_USER}#" \
		-e "s#\(ldap.authentication.java.naming.security.credentials=\).*#\1${LDAP_PASSWORD}#" \
		/opt/alfresco/tomcat/shared/classes/alfresco-global.properties
	cp modules/platform/amps/* ${ALF_HOME}/addons/alfresco
	${ALF_HOME}/addons/apply.sh all

	${ALF_HOME}/alfresco-service.sh stop
	${ALF_HOME}/alfresco-service.sh start
	${ALF_HOME}/scripts/libreoffice.sh start
	cp jars/platform/* /opt/alfresco/tomcat/webapps/alfresco/WEB-INF/lib/
fi

if [ ${SOLR} = 'localhost' -o ${SOLR} = ${INTERNAL_IP} ]
then
	echo "Solr install"
	sed -i.bak -e "s#\(SOLR_ALFRESCO_HOST=\).*#\1${REPO}#" /opt/alfresco/solr6/solr.in.sh
	cp --backup /opt/alfresco/solr6/logs/log4j.properties /opt/alfresco/logs/solr6/log4j.properties
	systemctl start alfresco-search.service
fi

if [ ${DNS_IP} = ${IP} ]
then
	#Share config
	for i in alfresco-googledocs-share
	do
		rm modules/share/amps/${i}*
	done
	cp modules/share/amps/* ${ALF_HOME}/addons/share
	${ALF_HOME}/alfresco-service.sh stop
	${ALF_HOME}/addons/apply.sh all
	${ALF_HOME}/alfresco-service.sh start

	cp jars/share/* /opt/alfresco/tomcat/webapps/share/WEB-INF/lib/


	apt install apache2 libapache2-mod-jk
	cp config/share/etc/ssl/private/malariagen.net.key /etc/ssl/private/malariagen.net.key
	chown root:ssl-cert /etc/ssl/private/malariagen.net.key
	chmod 640 /etc/ssl/private/malariagen.net.key
	cp config/share/etc/ssl/certs/* /etc/ssl/certs

	usermod -a -G ssl-cert www-data
	usermod -a -G ssl-cert postfix
    postconf -e smtpd_tls_cert_file=/etc/ssl/certs/malariagen-2017.crt
    postconf -e smtpd_tls_CAfile=/etc/ssl/certs/IntermediateCA.crt
    postconf -e smtpd_tls_key_file=/etc/ssl/private/malariagen.net.key
    postconf -e smtpd_tls_protocols=!SSLv2,!SSLv3
    postconf -e smtpd_tls_ciphers=high
    postconf -e smtpd_use_tls=yes
    postconf -e "smtpd_relay_restrictions=permit_sasl_authenticated,permit_mynetworks,reject_unauth_destination,reject_rbl_client sbl.spamhaus.org,reject_unauth_destination,reject_invalid_helo_hostname,reject_unknown_recipient_domain"


	cp config/share/etc/apache2/sites-available/* /etc/apache2/sites-available
	sed -i -e "s/\(ServerName\s*\).*/\1${NAME}/" -e "s#\(Redirect permanent /share https://\)[^/]*#\1${NAME}#" /etc/apache2/sites-available/alfresco.conf
	a2enmod rewrite
	a2enmod ssl
	a2enmod headers
	a2enmod proxy_http
	a2ensite alfresco

	cp config/share/var/lib/tomcat/shared/classes/share-global.properties /opt/alfresco/tomcat/shared/classes/
	cp --backup /opt/alfresco/tomcat/shared/classes/alfresco/web-extension/share-config-custom.xml /opt/alfresco/tomcat/shared/classes/alfresco/web-extension/share-config-custom.xml.orig
	cp config/share/var/lib/tomcat/shared/classes/alfresco/web-extension/share-config-custom.xml /opt/alfresco/tomcat/shared/classes/alfresco/web-extension/share-config-custom.xml
	sed -i -e "s#\(<endpoint-url>http://\)[^:]*#\1${REPO}#" /opt/alfresco/tomcat/shared/classes/alfresco/web-extension/share-config-custom.xml

	cp --backup /opt/alfresco/tomcat/conf/server.xml /opt/alfresco/tomcat/conf/server.xml.orig
	cp config/share/etc/tomcat/server.xml /opt/alfresco/tomcat/conf/server.xml


	cp --backup /etc/libapache2-mod-jk/workers.properties /etc/libapache2-mod-jk/workers.properties.orig
	cp config/share/etc/libapache2-mod-jk/workers.properties /etc/libapache2-mod-jk/workers.properties
	sed -i -e "s/\(worker.alfresco-worker.host=\).*/\1${REPO}/" /etc/libapache2-mod-jk/workers.properties

    cp --backup config/share/etc/postfix/transport /etc/postfix/transport
    sed -i -e "s/\[.[^]]*/\[${REPO}/" /etc/postfix/transport
    postmap /etc/postfix/transport
    postconf -e transport_maps=hash:/etc/postfix/transport
    postfix reload
fi

${ALF_HOME}/alfresco-service.sh restart
